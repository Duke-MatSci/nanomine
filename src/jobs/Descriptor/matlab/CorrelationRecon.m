function CorrelationRecon(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,NumOfRecon,correlation_choice)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%%% types of correlation function available %%
% 1 : Two Point Autocorrelation
% 2 : Two point Lineal Path Correlation
% 3 : Two point Cluster Correlation
% 4 : Two point Surface-Surface Correlation
%%%

%%% Umar edits
% 1: Fix the reconstruction size to 200 by 200 for images with greater sizes
%%%
writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
rc=0;
try
  path_to_read = [jobSrcDir,'/'];
  path_to_write = [jobSrcDir,'/output'];
  
  mkdir(path_to_write);
  num_recon = str2num(NumOfRecon);
  correlation_choice = str2num(correlation_choice);
  %% Specify import function according to input option
  switch str2num(input_type)
      case 1
          img = imread([path_to_read,file_name]); % read the incming target and store pixel values
          %% Umar added to check and binarize the image using Otsu 02/27/2019
if max(img(:))>1
    Target = double(img);
    Target = Target/256; %
    level = graythresh(Target);
    img = im2bw(Target,level);
    
end
%%
          imwrite(256*img,[path_to_write,'/','Input1.jpg']);
          legendInfo{1} = 'Target Image'; % Create legend for plots and variable names to save in .csv
          legendInfo_table{1} = 'Target_Image'; % Create variable names to save in .csv
      case 2
          img = unzip([path_to_read,file_name],[path_to_write,'/input']);
          [target_corrf,L1,L2]=zip_file_processing_recon(path_to_write,correlation_choice);
          legendInfo{1} = 'Mean Of Inputs'; % Create legend for plots and variable names to save in .csv
          legendInfo_table{1} = 'Mean_Of_Inputs'; % Create variable names to save in .csv
      case 3
          load([path_to_read,file_name]);
          img = Input;
          img_viewable = 256 * img;
          imwrite(img_viewable,[path_to_write,'/','Input1.jpg']);
          legendInfo{1} = 'Target Image'; % Create legend for plots and variable names to save in .csv
          legendInfo_table{1} = 'Target_Image'; % Create variable names to save in .csv
  end
  switch (correlation_choice)
      case 1
          try
          calc_Corr = @evaluate;
          Y_label = 'Two Point Autocorrelation';
          Correlation_name = 'Two_Point_Autocorrelation';
          catch
              writeError([path_to_write, '/errors.txt'], ['Failed to perform Two Point Autocorrelation ']);
        rc = 99;
        exit(rc);
          end
          
      case 2
          try
          calc_Corr = @L_2D;
          Y_label = 'Two Point Lineal Path Correlation';
          Correlation_name = 'Lineal_Path_Correlation';
          catch
              writeError([path_to_write, '/errors.txt'], ['Failed to perform Two Point Lineal Path Correlation ']);
        rc = 99;
        exit(rc);
          end
          
      case 3
          try
          calc_Corr = @C2;
          Y_label = 'Two Point Cluster Correlation';
          Correlation_name = 'Cluster_Correlation';
          catch
              writeError([path_to_write, '/errors.txt'], ['Failed to perform Cluster Correlation']);
        rc = 99;
        exit(rc);
          end
          
      case 4
          try
          calc_Corr = @Ss_2D;
          Y_label = 'Two Point Surface-Surface Correlation';
          Correlation_name = 'Surface_Correlation';
          catch
              writeError([path_to_write, '/errors.txt'], ['Failed to perform Two Point Suraface-Surface Correlation ']);
        rc = 99;
        exit(rc);
          end
  end

  
  if input_type ~= 2
      if length(size(img)) > 2
          img = img(:,:,1);
      end
      
      if (max(max(img))) > 1
          Target_img = round(img/256);
      else
          Target_img = img;
      end
      
      switch (correlation_choice)
          case 1
              target_corrf = evaluate(Target_img);
              disp('Using S2');
              calc_Corr = @evaluate;
              Y_label = 'Two Point Autocorrelation';
              Correlation_name = 'Two_Point_Autocorrelation';
          case 2
              target_corrf = L_2D(Target_img);
              disp('Using L2');
              calc_Corr = @L_2D;
              Y_label = 'Two Point Lineal Path Correlation';
              Correlation_name = 'Lineal_Path_Correlation';
          case 3
              target_corrf = C2(Target_img);
              disp('Using C2');
              calc_Corr = @C2;
              Y_label = 'Two Point Cluster Correlation';
              Correlation_name = 'Cluster_Correlation';
          case 4
              target_corrf = Ss_2D(Target_img);
              disp('Using Surf2');
              calc_Corr = @Ss_2D;
              Y_label = 'Two Point Surface-Surface Correlation';
              Correlation_name = 'Surface_Correlation';
      end
L1 = size(Target_img,1); L2 = size(Target_img,2); % get dimensions of image to be reconstructed
     if L1>200
         L1=200; %Fix the reconstruction size for sizes above 200
     end
     if L2>200
         L2=200; %Fix the reconstruction size for sizes above 200
     end
 
     
%     S2_target = evaluate(Target_img); % calculate S2 of target
      %     L2_target = L_2D(Target_img);
      %     Surf2_target = Ss_2D(Target_img);
      %     C2_target = C2(Target_img);
      %     size_of_recon = size(Target_img,1);
  end


        recon_corrf = zeros(length(target_corrf),num_recon);
        % S2_recon = zeros(length(S2_target),num_recon);
        % L2_recon = zeros(length(L2_target),num_recon);
        % Surf2_recon = zeros(length(Surf2_target),num_recon);
        % C2_recon = zeros(length(C2_target),num_recon);

        time_req = zeros(num_recon,1);
        error = zeros(num_recon,1);

        for i = 1:num_recon
            [Recon_img,time_req(i,1),iter_req,error(i,1)] = two_point_recon(target_corrf,L1,L2,correlation_choice);
        %     if i==1
        %         mkdir(path_to_write);
        % 	imwrite(img,[path_to_write,'/Target.jpg']);
        %    end
        %     S2_recon(:,i) = evaluate(Recon_img);
        %     L2_recon(:,i) = L_2D(Recon_img);
        %     Surf2_recon(:,i) = Ss_2D(Recon_img);
        %     C2_recon(:,i) = C2(Recon_img);
            recon_corrf(:,i) = calc_Corr(Recon_img);
            imwrite(256*Recon_img,[path_to_write,'/Reconstruct',num2str(i),'.jpg']);
            %save([path_to_write,'/Reconstruct',num2str(i),'.mat'],'Recon_img');
        end
try
        %%Plotting%%
        figure('color',[1,1,1])
        hold on;
        plot( 0:1:length(target_corrf)-1, target_corrf , 'LineWidth',2.5);
        %Create legend names
        for i = 1 : num_recon
            plot( 0:1:length(target_corrf)-1, recon_corrf(:,i), 'LineWidth',2.5);
            legendInfo{i+1} = ['Reconstruction #',num2str(i)];
            legendInfo_table{i+1} = ['Reconstruction',num2str(i)];
        end
        xlabel('Distance (Pixel)');
        ylabel(Y_label);
        box on;
        legend(legendInfo);
        saveas(gcf,[path_to_write,'/Correlation Comparison.jpg']);
        hold off;
catch
    writeError([path_to_write, '/errors.txt'], 'Could not plot the results');
    rc=99;
    exit(rc)
end
        % figure('color',[1,1,1])
        % hold on;
        % plot( 0:1:length(L2_target)-1, L2_target , 'LineWidth',2.5);
        % for i = 1 : num_recon
        % 	plot( 0:1:length(L2_target)-1, L2_recon(:,i), 'LineWidth',2.5);
        % end
        % xlabel('Distance (Pixel)');
        % ylabel('2-point Lineal Path Function');
        % box on;
        % legend(legendInfo);
        % saveas(gcf,[path_to_write,'/Lineal Path_Comparison.jpg']);
        % hold off;
        % 
        % figure('color',[1,1,1])
        % hold on;
        % plot( 0:1:length(C2_target)-1, C2_target , 'LineWidth',2.5);
        % for i=1:num_recon
        % 	plot( 0:1:length(C2_target)-1, C2_recon(:,1),'LineWidth',2.5);
        % end
        % xlabel('Distance (Pixel)');
        % ylabel('2-point Cluster Correlation Function');
        % box on;
        % legend(legendInfo);
        % saveas(gcf,[path_to_write,'/Cluster Correlation_Comparison.jpg']);
        % hold off;
        % 
        % figure('color',[1,1,1])
        % hold on;
        % plot( 0:1:length(Surf2_target)-1, Surf2_target , 'LineWidth',2.5);
        % for i=1:num_recon
        % 	plot( 0:1:length(Surf2_target)-1, Surf2_recon(:,1),'LineWidth',2.5);
        % end
        % xlabel('Distance (Pixel)');
        % ylabel('2-point Surface Correlation Function');
        % box on;
        % legend(legendInfo);
        % saveas(gcf,[path_to_write,'/Surface Correlation_Comparison.jpg']);
        % hold off;

        %% Saving Useful Data %%
        %Concatenate correlations and convert them to table
        Correlation = cat(2,target_corrf,recon_corrf); Correlation = array2table(Correlation); 
        % S2 = cat(2,S2_target,S2_recon); S2 = array2table(S2); 
        % L2 = cat(2,L2_target,L2_recon); L2 = array2table(L2); 
        % Cluster2 = cat(2,C2_target,C2_recon); Cluster2 = array2table(Cluster2); 
        % Surface2 = cat(2,Surf2_target,Surf2_recon); Surface2 = array2table(Surface2); 

        % Rename variables in table appropriately
        Correlation.Properties.VariableNames = legendInfo_table;
        % S2.Properties.VariableNames = legendInfo_table;
        % L2.Properties.VariableNames = legendInfo_table;
        % Cluster2.Properties.VariableNames = legendInfo_table;
        % Surface2.Properties.VariableNames = legendInfo_table;

        % Save tables
        writetable(Correlation,[path_to_write,'/',Correlation_name,'.csv']);
        % writetable(S2,[path_to_write,'/','Autocorrelation.csv']);
        % writetable(L2,[path_to_write,'/','Lineal_Path_Correlation.csv']);
        % writetable(Cluster2,[path_to_write,'/','Cluster_Correlation.csv']);
        % writetable(Surface2,[path_to_write,'/','Surface_Correlation.csv']);
        % save([path_to_write,'/2 Point Autocorrelation.mat'],'S2');
        % save([path_to_write,'/2 Point Lineal Path Correlation.mat'],'L2');
        % save([path_to_write,'/2 Point Cluster Correlation.mat'],'Cluster2');
        % save([path_to_write,'/2 Point Surface Correlation.mat'],'Surface2');

    %% ZIP files %%
    zip([path_to_write,'/Results.zip'],{'*'},path_to_write);
        
catch ex
  rc = 99;
  exit(rc);
end
    function writeError(file, msg)
    f = fopen(file,'a+');
    fprintf(f, '%s\n', msg);
    fclose(f);
    end

end