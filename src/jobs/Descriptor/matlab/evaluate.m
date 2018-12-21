function corrf=evaluate(image)  % corrf is the correlation function; A is the input matrix
% This function is written by Prof. Dikin's group, Northwestern University
% Commented and Revised by Hongyi Xu, IDEAL lab
image = double(image>0);
[imax, jmax] = size(image);

A = image;

R = min(round(imax/2),round(jmax/2));  % for a square image, R is half of the edge length
count = zeros(round(1.414*R)+1,1);
Bn = zeros(round(1.414*R)+1,1); % Initialization of Bn: set the value as 0

A = A - mean(mean(A));
F = fft2(A);
c = fftshift(ifft2(F.*conj(F))); % 2-points correlation. fftshift is to move the peak in the center of the image
% This 2-points correlation function refers to DT Fullwood, SR Kalidindi,
% SR Niezgoda, A Fast, N Hampson: "Gradient-based microstructure 
% reconstructions from distribution useing fast Fourier transforms",
% Material Science and Engineering, Volume 494, Issues 1-2, 2008, P68-72

[y,jc] = max(max(c));   % This two lines is to find the max value of the matrix, and 
[y,ic] = max(max(c'));  % also find the coordinates (location) of the max value in the matrix

for i = 1:imax
    for j = 1 : jmax
        r = ceil(sqrt((i-ic)^2 + (j-jc)^2)); % r is the distances between a given point and the max value point(peak).
        if r<=round(1.414*R)   % this constraints is to confine the counting range into a circle which has the radius of R, and centered at the peak
            Bn(r+1) = Bn(r+1) + c(i,j);  % add all the value of the pixels together, which are located on the same circle centered at the peak
            count(r+1) = count(r+1) +1;  % also count the number of the pixels located on the same circle. It should be monotone increasing.
        end
    end
end

Bn = Bn./count; % calculate the average value of each Bn(average value of the pixels located on the same circle)
corrf = Bn./y;  % y is the max value of the matrix "c" 

VF = sum( image(:) )/(imax*jmax);
LL = length(corrf);
realcorr = VF^2 + (VF - VF^2) ./ ( corrf(1) - corrf(LL) ) .* ( corrf - corrf(LL) );
corrf = realcorr;
