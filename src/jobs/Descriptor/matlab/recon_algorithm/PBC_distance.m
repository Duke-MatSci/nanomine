function dis = PBC_distance(cl, L, ii)
% calculate the cluster centers's distances under periodic boundary
% conditions
N = length(cl(:,1));

% Input variables: cl -- list of the cluster centers
%                  N -- the number of clusters
%                  L -- the length of the image (in pixels)
% Output varibale: dis -- the nearest cluster distances under the periodic
% boundary conditions.

% Xiaolin Li
% Jul. 2015
% Northwestern University
dis = [];
cl_copy = repmat(cl(ii,:),[N,1]);
nd_list = [];
for x_index = -1:1
    for y_index = -1:1
        for z_index = -1:1
            if (x_index ~=0) || (y_index ~=0) || (z_index ~=0)
                % the indexes are used to make sure that we are not
                % duplicating the same coordinates as cl
                flag = 1;    
            else
                flag = 0;
            end
                % centers of clusters in the neighboring blocks
                cl_temp = [cl_copy(:,1) + x_index*L, cl_copy(:,2) + y_index*L, cl_copy(:,3) + z_index * L];
                % store it into the neighbor list
                distances = (cl-cl_temp).^2;
                distances = sum(distances, 2);
                distances = distances.^(1/2);
%                 distances = sort(distances, 'ascend');
%             if flag == 1
%                     %neighboring block, select the nearest center distance
%                 nd_this = distances(1);
%             else 
%                     %the original block, select the second nearest center
%                     %distance because the first is always zero.
%                 nd_this = distances(2);
%             end
            dis = [dis distances];  
        end
    end
end
dis = min(dis,[],2);
end
